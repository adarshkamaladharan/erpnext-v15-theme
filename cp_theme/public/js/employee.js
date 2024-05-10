console.log("emplkoyee js..")
frappe.views.ImageView = class ImageView extends frappe.views.ListView {
	get view_name() {
		return "Images...";
	}

	setup_defaults() {
		return super.setup_defaults().then(() => {
			this.page_title = this.page_title + " " + __("Images");
		});
	}

	setup_view() {
		this.setup_columns();
		this.setup_check_events();
		this.setup_like();
	}

	set_fields() {
		this.fields = [
			"name",
			...this.get_fields_in_list_view().map((el) => el.fieldname),
			this.meta.title_field,
			this.meta.image_field,
			"_liked_by",
		];
	}

	prepare_data(data) {
		super.prepare_data(data);
		this.items = this.data.map((d) => {
			// absolute url if cordova, else relative
			d._image_url = this.get_image_url(d);
			return d;
		});
	}

	render() {
		this.get_attached_images().then(() => {
			this.render_image_view();

			if (!this.gallery) {
				this.setup_gallery();
			} else {
				this.gallery.prepare_pswp_items(this.items, this.images_map);
			}
		});
	}

	render_image_view() {
		var html = this.items.map(this.item_html.bind(this)).join("");

		this.$page.find(".layout-main-section-wrapper").addClass("image-view");

		this.$result.html(`
			<div class="image-view-container">
				${html}
			</div>
		`);

		this.render_count();
	}

	item_details_html(item) {
		// TODO: Image view field in DocType
		let info_fields = this.get_fields_in_list_view().map((el) => el.fieldname) || [];
		const title_field = this.meta.title_field || "name";
		info_fields = info_fields.filter((field) => field !== title_field);
		let info_html = `<div><ul class="list-unstyled image-view-info">`;
		let set = false;
		info_fields.forEach((field, index) => {
			if (item[field] && !set) {
				if (index == 0) info_html += `<li>${__(item[field])}</li>`;
				else info_html += `<li class="text-muted">${__(item[field])}</li>`;
				// set = true;
			}
		});
		info_html += `</ul></div>`;
		return info_html;
	}

	item_html(item) {
		item._name = encodeURI(item.name);
		const encoded_name = item._name;
		const title = strip_html(item[this.meta.title_field || "name"]);
		const escaped_title = frappe.utils.escape_html(title);
		const _class = !item._image_url ? "no-image" : "";
		const _html = item._image_url
			? `<img data-name="${encoded_name}" src="${item._image_url}" alt="${title}">`
			: `<span class="placeholder-text">
				${frappe.get_abbr(title)}
			</span>`;

		let details = this.item_details_html(item);

		const expand_button_html = item._image_url
			? `<div class="zoom-view" data-name="${encoded_name}">
				${frappe.utils.icon("expand", "xs")}
			</div>`
			: "";

		return `
			<div class="image-view-item ellipsis">
				<div class="image-view-header">
					<div>
						<input class="level-item list-row-checkbox hidden-xs"
							type="checkbox" data-name="${escape(item.name)}">
						${this.get_like_html(item)}
					</div>
				</span>
				</div>
				<div class="image-view-body ${_class}">
					<a data-name="${encoded_name}"
						title="${encoded_name}"
						href="${this.get_form_link(item)}"
					>
						<div class="image-field"
							data-name="${encoded_name}"
						>
							${_html}
						</div>
					</a>
					${expand_button_html}
				</div>
				<div class="image-view-footer">
					<div class="image-title">
						<span class="ellipsis" title="${escaped_title}">
							<a class="ellipsis" href="${this.get_form_link(item)}"
								title="${escaped_title}" data-doctype="${this.doctype}" data-name="${item.name}">
								${title}
							</a>
						</span>
					</div>
					${details}
				</div>
			</div>
		`;
	}

	get_attached_images() {
		return frappe
			.call({
				method: "frappe.core.api.file.get_attached_images",
				args: {
					doctype: this.doctype,
					names: this.items.map((i) => i.name),
				},
			})
			.then((r) => {
				this.images_map = Object.assign(this.images_map || {}, r.message);
			});
	}

	get_header_html() {
		// return this.get_header_html_skeleton(`
		// 	<div class="list-image-header">
		// 		<div class="list-image-header-item">
		// 			<input class="level-item list-check-all hidden-xs" type="checkbox" title="Select All">
		// 			<div>${__(this.doctype)} &nbsp;</div>
		// 			(<span class="text-muted list-count"></span>)
		// 		</div>
		// 		<div class="list-image-header-item">
		// 			<div class="level-item list-liked-by-me">
		// 				${frappe.utils.icon('heart', 'sm', 'like-icon')}
		// 			</div>
		// 			<div>${__('Liked')}</div>
		// 		</div>
		// 	</div>
		// `);
	}

	setup_gallery() {
		var me = this;
		this.gallery = new frappe.views.GalleryView({
			doctype: this.doctype,
			items: this.items,
			wrapper: this.$result,
			images_map: this.images_map,
		});
		this.$result.on("click", ".zoom-view", function (e) {
			e.preventDefault();
			e.stopPropagation();
			var name = $(this).data().name;
			name = decodeURIComponent(name);
			me.gallery.show(name);
			return false;
		});
	}
};